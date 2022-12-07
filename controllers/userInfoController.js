const { UserInfo, UserInfoRating, NotificationState, Order, PartnerByGroup, Subscription, UserAppState, LimitCounter, UserAppLimit, UserAppSetting, User } = require('../models/models')
const ApiError = require('../exceptions/api_error')
const { Op } = require("sequelize")
const { v4 } = require("uuid")

class UserInfoController {
    async create(req, res, next) {
        try {
            let {
                formData
            } = req.body

            let uuid = v4()

            let {
                userId,
                country,
                legal,
                city,
                phone,
                website,
                company_name,
                company_inn,
                company_adress,
                type_of_customer,
                name_surname_fathersname,
                passport_number,
                passport_date_of_issue,
                passport_issued_by,
                email,
                company_adress_latitude,
                company_adress_longitude,
                city_latitude,
                city_longitude,
            } = formData

            let user = await User.findOne({ where: { id: userId } })

            let user_info = await UserInfo.create({
                userId,
                country: country.value,
                legal: legal.value,
                city: city.value,
                phone: phone.value,
                website: website.value,
                company_name: company_name.value,
                company_inn: company_inn.value,
                company_adress: company_adress.value,
                type_of_customer: type_of_customer.value,
                name_surname_fathersname: name_surname_fathersname.value,
                passport_number: passport_number.value,
                passport_date_of_issue: passport_date_of_issue.value,
                passport_issued_by: passport_issued_by.value,
                email: email.value,
                uuid,
                company_adress_latitude,
                company_adress_longitude,
                city_latitude,
                city_longitude,
            })

            await NotificationState.create({ userInfoId: user_info.id })
            await Subscription.create({ userInfoId: user_info.id, planId: 1 })
            await UserAppState.create({ userInfoId: user_info.id })
            await UserAppLimit.create({ userInfoId: user_info.id })
            await LimitCounter.create({ userInfoId: user_info.id })

            let userAppSettingsDefaultList = [
                { name: 'Уведомлять о новых заказах на email', value: true, role: 'carrier' },
                { name: 'Перевозчик должен завершить точки перед завершением заказа', value: false, role: 'customer' },
                { name: 'Показывать новые заказы только партнерам из списка избранного', value: false, role: 'customer' },
                { name: 'Темная тема приложения', value: false, role: 'both' },
                { name: 'Мелкий шрифт приложения', value: false, role: 'both' },
                { name: 'Компактный показ заказов', value: false, role: 'both' },
            ]

            userAppSettingsDefaultList = userAppSettingsDefaultList.filter(el => el.role === user.role || el.role === 'both')

            for (const setting of userAppSettingsDefaultList) {
                await UserAppSetting.findOrCreate({
                    where: {
                        name: setting.name, value: setting.value, userInfoId: user_info.id
                    }
                }
                )
            }

            return res.json(user_info)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async getOne(req, res, next) {
        try {
            let { userId } = req.query
            let userInfo;
            userInfo = await UserInfo.findOne({ where: { userId } })
            return res.json(userInfo)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async getAll(req, res, next) {
        try {
            let { userInfos, partnerFilter } = req.body
            let userInfo;

            let sortDirection
            let sortColumn

            if (partnerFilter.partners.selectedSort === '') {
                sortDirection = 'id'
                sortColumn = 'ASC'
            }
            if (partnerFilter.partners.selectedSort === 'default') {
                sortDirection = 'id'
                sortColumn = 'DESC'
            }
            if (partnerFilter.partners.selectedSort === 'name') {
                sortDirection = 'name_surname_fathersname'
                sortColumn = 'ASC'
            }
            if (partnerFilter.partners.selectedSort === 'ratingUp') {
                sortDirection = 'total_rating'
                sortColumn = 'ASC'
            }
            if (partnerFilter.partners.selectedSort === 'ratingDown') {
                sortDirection = 'total_rating'
                sortColumn = 'ASC'
            }

            userInfo = await UserInfo.findAll({
                where: { id: userInfos }, order: [
                    [sortDirection, sortColumn]
                ]
            })

            let partnersByGroups = await PartnerByGroup.findAll({ where: { partnerGroupId: { [Op.in]: partnerFilter.partnersByGroups } } })
            partnersByGroups = partnersByGroups.map(el => el.partnerId)
            partnersByGroups = [...new Set(partnersByGroups)];

            userInfo = userInfo.filter(el => (el.id == partnerFilter.partners.id || partnerFilter.partners.id === '') && (el.name_surname_fathersname.toLowerCase().includes(partnerFilter.partners.partnerName.toLowerCase())
                || el.company_name.toLowerCase().includes(partnerFilter.partners.partnerName.toLowerCase())) && (partnersByGroups.includes(el.id) || partnersByGroups.length === 0))

            return res.json(userInfo)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async update(req, res, next) {
        try {
            let {
                formData
            } = req.body

            let {
                id,
                country,
                legal,
                city,
                phone,
                website,
                company_name,
                company_inn,
                company_adress,
                type_of_customer,
                name_surname_fathersname,
                passport_number,
                passport_date_of_issue,
                passport_issued_by,
                email,
                city_latitude,
                city_longitude,
                company_adress_latitude,
                company_adress_longitude
            } = formData

            if (country.value !== '') {
                await UserInfo.update({
                    country: country.value
                }, { where: { id: id } })
            }
            if (city.value !== '') {
                await UserInfo.update({
                    city: city.value,
                    city_latitude,
                    city_longitude
                }, { where: { id: id } })
            }
            if (phone.value !== '') {
                await UserInfo.update({
                    phone: phone.value
                }, { where: { id: id } })
            }
            if (type_of_customer.value !== '') {
                await UserInfo.update({
                    type_of_customer: type_of_customer.value
                }, { where: { id: id } })
            }
            if (name_surname_fathersname.value !== '') {
                await UserInfo.update({
                    name_surname_fathersname: name_surname_fathersname.value
                }, { where: { id: id } })
            }
            if (company_inn.value !== '') {
                await UserInfo.update({
                    company_inn: company_inn.value
                }, { where: { id: id } })
            }
            if (website.value !== '') {
                await UserInfo.update({
                    website: website.value
                }, { where: { id: id } })
            }
            if (company_name.value !== '') {
                await UserInfo.update({
                    company_name: company_name.value
                }, { where: { id: id } })
            }
            if (company_adress.value !== '') {
                await UserInfo.update({
                    company_adress: company_adress.value,
                    company_adress_latitude,
                    company_adress_longitude
                }, { where: { id: id } })
            }
            if (passport_number.value !== '') {
                await UserInfo.update({
                    passport_number: passport_number.value
                }, { where: { id: id } })
            }
            if (passport_date_of_issue.value !== '') {
                await UserInfo.update({
                    passport_date_of_issue: passport_date_of_issue.value
                }, { where: { id: id } })
            }
            if (passport_issued_by.value !== '') {
                await UserInfo.update({
                    passport_issued_by: passport_issued_by.value
                }, { where: { id: id } })
            }
            if (legal.value !== '') {
                await UserInfo.update({
                    legal: legal.value
                }, { where: { id: id } })
            }
            if (email.value !== '') {
                await UserInfo.update({
                    email: email.value
                }, { where: { id: id } })
            }
            return res.send('updated')
        }
        catch (e) {
            next(ApiError.badRequest(e.message))

        }
    }
}

module.exports = new UserInfoController()