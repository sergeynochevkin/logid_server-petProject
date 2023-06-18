const { Transport, User, UserInfo, Order } = require('../models/models')
const ApiError = require('../exceptions/api_error')
const { Op, where } = require("sequelize")
const mail_service = require('../service/mail_service')
const notification_service = require('../service/notification_service')

class ManagementController {

    async get_users(req, res, next) {

        try {

            let { userId } = req.query
            let users = await User.findAll({ where: { id: { [Op.ne]: userId }, email: { [Op.notIn]: ['sergey.nochevkin@gmail.com', 'sergey.nochevkin@hotmail.com', 'sergey.nochevkin@yandex.com', 'sergey.nochevkin@outlook.com'] } } })
            let userInfos = await UserInfo.findAll({})
            let transports = await Transport.findAll({})

            //clear that i dont need
            let handledUsers = []
            for (const user of users) {
                let userPattern = {
                    id: undefined,
                    email: '',
                    role: '',
                    created_at: '',
                    //maybe more
                    user_info: {},
                    transports: [],
                }
                //add what i need
                userPattern.id = user.id
                userPattern.email = user.email
                userPattern.role = user.role
                userPattern.created_at = user.created_at
                let userInfo = { ...userInfos.find(el => el.userId === user.id) }
                userPattern.user_info = { ...userInfo.dataValues }

                if (user.role === 'carrier' && transports) {
                    let userInfoId = userPattern.user_info.id
                    userPattern.transports = [...transports.filter(el => el.userInfoId === userInfoId)]
                }
                handledUsers.push(userPattern)
            }

            return res.json(handledUsers)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async get_orders(req, res, next) {
        try {
            let orders = await Order.findAll({})
            return res.json(orders)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async get_transports(req, res, next) {
        try {
            let transports = await Transport.findAll({})
            return res.json(transports)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async send_notification(req, res, next) {
        try {
            let { formData } = req.body

            let { members, subject, message, type } = formData
            console.log(members);


            if (type === 'mail') {
                await mail_service.sendManagementEmail(subject, message, members)
            }
            if (type === 'alert') {
                await notification_service.addManagementNotification(subject, message, members)
            }
            if (type === 'mail_alert') {
                await mail_service.sendManagementEmail(subject, message, members)
                await notification_service.addManagementNotification(subject, message, members)
            }

            return res.send('notification_sent')
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }
}

module.exports = new ManagementController()