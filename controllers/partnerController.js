const { Partner, OtherRating, PartnerGroup, PartnerByGroup, UserInfo, User } = require('../models/models')
const ApiError = require('../exceptions/api_error')
const { Op } = require("sequelize")
const translateService = require('../service/translate_service')
const { role_service } = require('../controllers/order_controller/role_service')
const { supervisor_id_service } = require('../controllers/order_controller/supervisor_id_service')

class PartnerController {
    async create(req, res, next) {
        try {
            let {
                userInfoId, partnerUserInfoId, status
            } = req.body

            let role = await role_service(userInfoId)
            if (role === 'driver') {
                let supervisorId = await supervisor_id_service(userInfoId)
                userInfoId = supervisorId
            }
            await Partner.findOrCreate({
                where: {
                    userInfoId, partnerUserInfoId, status
                }
            }).then(OtherRating.findOrCreate({
                where: {
                    raterUserInfoId: userInfoId,
                    ratedUserInfoId: partnerUserInfoId,
                }
            }))

            const partner = await Partner.findOrCreate({
                where: {
                    userInfoId: partnerUserInfoId, partnerUserInfoId: userInfoId, status
                }
            }).then(OtherRating.findOrCreate({
                where: {
                    raterUserInfoId: partnerUserInfoId,
                    ratedUserInfoId: userInfoId,
                }
            }))
            return res.json(partner)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async addPartnerByKey(req, res, next) {
        try {
            const {
                language, role, userInfoId, key
            } = req.body

            let newPartner = await UserInfo.findOne({ where: { uuid: key } })

            let user_info = await UserInfo.findOne({ where: { id: userInfoId } })

            let partners = await Partner.findAll({ where: { userInfoId } })
            partners = partners.map(el => el.partnerUserInfoId)
            let newPartnerRole
            if (newPartner) {
                newPartnerRole = await User.findOne({ where: { id: newPartner.userId } })
                newPartnerRole = newPartnerRole.role
            }

            let partner
            let addedPartner


            // myself
            if (newPartner) {
                if (newPartner.dataValues.id === user_info.dataValues.id) {
                    partner = translateService.setNativeTranslate(language,
                        {
                            russian: ['Вы не можете добавить партнером себя'],
                            english: ['You cannot add yourself as a partner'],
                            spanish: ['No puedes agregarte como socio'],
                            turkish: ['Kendinizi ortak olarak ekleyemezsiniz'],
                            chinese: ['您无法将自己添加为合作伙伴'],
                            hindi: ['आप स्वयं को भागीदार के रूप में नहीं जोड़ सकते'],
                        }
                    )
                }
                else if (partners.includes(newPartner.id)) {
                    partner = translateService.setNativeTranslate(language,
                        {
                            russian: ['Такой партнер уже есть'],
                            english: ['Such a partner already exists'],
                            spanish: ['Un socio así ya existe'],
                            turkish: ['Böyle bir ortak zaten mevcut'],
                            chinese: ['这样的合作伙伴已经存在'],
                            hindi: ['ऐसा पार्टनर पहले से मौजूद है'],
                        }
                    )
                }
                else if (newPartner && (role !== newPartnerRole)) {
                    partner = await Partner.findOrCreate({
                        where: {
                            userInfoId, partnerUserInfoId: newPartner.id
                        }
                    }).then(OtherRating.findOrCreate({
                        where: {
                            raterUserInfoId: userInfoId,
                            ratedUserInfoId: newPartner.id,
                        }
                    }))

                    addedPartner = await Partner.findOrCreate({
                        where: {
                            userInfoId: newPartner.id, partnerUserInfoId: userInfoId
                        }
                    }).then(OtherRating.findOrCreate({
                        where: {
                            raterUserInfoId: newPartner.id,
                            ratedUserInfoId: userInfoId
                        }
                    }))
                }
                else if (role === newPartnerRole) {
                    partner = `${role === 'carrier' ? translateService.setNativeTranslate(language,
                        {
                            russian: ['Вы являетесь перевозчиком и не можете добавить перевозчика'],
                            english: ['You are a carrier and cannot add a carrier'],
                            spanish: ['Eres un transportista y no puedes agregar un transportista'],
                            turkish: ['Operatörsünüz ve operatör ekleyemezsiniz'],
                            chinese: ['您是运营商，无法添加运营商'],
                            hindi: ['आप एक वाहक हैं और कोई वाहक नहीं जोड़ सकते'],
                        }
                    ) : translateService.setNativeTranslate(language,
                        {
                            russian: ['Вы являетесь заказчиком и не можете добавить заказчика'],
                            english: ['You are a customer and cannot add a customer'],
                            spanish: ['Eres cliente y no puedes agregar un cliente'],
                            turkish: ['Müşterisiniz ve müşteri ekleyemezsiniz'],
                            chinese: ['您是客户，无法添加客户'],
                            hindi: ['आप एक ग्राहक हैं और ग्राहक नहीं जोड़ सकते'],
                        }
                    )}`
                }
            }
            else {
                partner = translateService.setNativeTranslate(language,
                    {
                        russian: ['Партнер не найден'],
                        english: ['Partner not found'],
                        spanish: ['Socio no encontrado'],
                        turkish: ['İş ortağı bulunamadı'],
                        chinese: ['未找到合作伙伴'],
                        hindi: ['साथी नहीं मिला'],
                    }
                )
            }
            return res.json(partner)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async createGroup(req, res, next) {
        try {
            const {
                userInfoId, name
            } = req.body
            const group = await PartnerGroup.findOrCreate({
                where: {
                    userInfoId, name
                }
            })
            return res.json(group)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async getAll(req, res, next) {
        try {
            let { userInfoId } = req.query
            let partner;
            let role = await role_service(userInfoId)
            let supervisorId
            if (role === 'driver') {
                supervisorId = await supervisor_id_service(userInfoId)
                partner = await Partner.findAll({ where: { userInfoId: supervisorId }, order: ['id'] })
            } else {
                partner = await Partner.findAll({ where: { userInfoId }, order: ['id'] })
            }  
        return res.json(partner)
    } catch(e) {
        next(ApiError.badRequest(e.message))
    }
}

    async getGroups(req, res, next) {
    try {
        var groups = []
        let { userInfoId, partnerIds } = req.body
        let allGroups = await PartnerGroup.findAll({ where: { userInfoId } })
        let extraObject = { partners: [] }
        const pushGroups = function (item) {
            groups.push(item)

        }
        for (const group of allGroups) {
            let currentPartners = await PartnerByGroup.findAll({
                where: { partnerGroupId: group.id },
            })
            currentPartners = currentPartners.map(el => el.partnerId)

            extraObject.partners = currentPartners
            let groupItem = { ...group, ...extraObject }
            pushGroups(groupItem)
        }
        return res.json(groups)
    } catch (e) {
        next(ApiError.badRequest(e.message))
    }
}

    async update(req, res, next) {
    try {
        let { id, status } = req.body
        await Partner.update({ status }, { where: { id: id } })
        return res.send('updated')
    }
    catch (e) {
        next(ApiError.badRequest(e.message))
    }
}

    async deleteGroup(req, res, next) {
    try {
        let { id } = req.query
        await PartnerGroup.destroy({ where: { id: id } })
        await PartnerByGroup.destroy({ where: { partnerGroupId: id } })
    }
    catch (e) {
        next(ApiError.badRequest(e.message))
    }
    return res.send('deleted')
}


    async deletePartnerFromGroup(req, res, next) {
    try {
        let { id, groupId } = req.query
        await PartnerByGroup.destroy({ where: { partnerId: id, partnerGroupId: groupId } })
    }
    catch (e) {
        next(ApiError.badRequest(e.message))
    }
    return res.send('deleted')
}


    async updateGroups(req, res, next) {
    try {
        let { userInfoId, partnerId, groupIds } = req.body


        let currentConnections = await PartnerByGroup.findAll({
            where: { partnerId, userInfoId },
        })

        let coneectionsForDestroy = currentConnections.filter(el => !groupIds.includes(el.partnerGroupId)).map(el => el.id)
        let coneectionsForCreate = groupIds.filter(el => !currentConnections.map(el => el.partnerGroupId).includes(el))

        await PartnerByGroup.destroy({ where: { id: { [Op.in]: coneectionsForDestroy } } })

        coneectionsForCreate.forEach(async element => {
            await PartnerByGroup.create({ partnerId: partnerId, partnerGroupId: element, userInfoId })
        });
        return res.send('updated')
    }
    catch (e) {
        next(ApiError.badRequest(e.message))
    }
}
}

module.exports = new PartnerController()

