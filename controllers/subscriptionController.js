const { Subscription, SubscriptionOptionsByPlan, SubscriptionOption, User, UserInfo, LimitCounter, SubscriptionPlan, UserAppLimit, Invoice } = require('../models/models')
const ApiError = require('../exceptions/api_error')
const { Op } = require('sequelize')
const limitService = require('../service/limit_service')
const translateService = require('../service/translate_service')
const paymentService = require('../service/payment_service')
const { setTime } = require('../service/time_service')


class SubscriptionController {


    async update(req, res, next) {
        let { language, description, userInfoId, plan, payment_id } = req.body
        let planId
        let currentPlan
        let initialTime
        let paid_to
        let userInfo



        try {
            if (!payment_id) {
                planId = plan.plan_id
                userInfo = await UserInfo.findOne({ where: { id: userInfoId } })
                currentPlan = await Subscription.findOne({ where: { userInfoId } })

                if (currentPlan.dataValues.planId === plan.plan_id) {
                    initialTime = new Date(currentPlan.dataValues.paid_to)
                    initialTime.setHours(23, 59, 59, 0)
                    paid_to = setTime(initialTime, 1440 * plan.period, 'form')
                } else {
                    initialTime = new Date();
                    initialTime.setHours(23, 59, 59, 0)
                    paid_to = setTime(initialTime, 1440 * plan.period, 'form')
                }
                await limitService.check_trial_used(language, userInfoId, planId)
            }

            if (payment_id) {
                let body = await Invoice.findOne({ where: { payment_id } })
                userInfoId = body.dataValues.userInfoId

                userInfo = await UserInfo.findOne({ where: { id: userInfoId } })

                let order_details = { ...JSON.parse(body.dataValues.order_details) }
                planId = order_details.plan.plan_id
                currentPlan = await Subscription.findOne({ where: { userInfoId } })
                plan = await SubscriptionPlan.findOne({ where: { plan_id: planId, country: userInfo.dataValues.country } })


                if (currentPlan.dataValues.planId === planId) {
                    initialTime = new Date(currentPlan.dataValues.paid_to)
                    initialTime.setHours(23, 59, 59, 0)
                    paid_to = setTime(initialTime, 1440 * plan.dataValues.period, 'form')
                } else {
                    initialTime = new Date();
                    initialTime.setHours(23, 59, 59, 0)
                    paid_to = setTime(initialTime, 1440 * plan.period, 'form')
                }
            }

            try {


                let price = plan.price
                let status = 'new'
                let type = 'subscription'

                let res_object = {
                    message: '',
                    token: '',
                    payment_id: '',
                    invoice_id: undefined
                }

                //if not trial!!!

                //payment logics

                if (planId !== 1 && planId !== 2 && userInfo.country === 'russia' && !payment_id) {
                    let order_details = { ...req.body, email: userInfo.email, quantity: 1 }
                    let invoice = await Invoice.create({ userInfoId, type, price, status, order_details: JSON.stringify(order_details) })

                    res_object.invoice_id = invoice.id
                    let payment = await paymentService.createPayment(invoice)
                    res_object.token = payment.confirmation.confirmation_token
                    res_object.payment_id = payment.id
                    res_object.message = translateService.setNativeTranslate(language,
                        {
                            russian: ['Пожалуйста, оплатите подписку'],
                            english: ['Pay for a subscription please'],
                            spanish: ['Pagar por una suscripción'],
                            turkish: ['Abonelik için ödeme yapın lütfen'],
                            chinese: ['支付订阅费用'],
                            hindi: ['सदस्यता अनुरोधों के लिए भुगतान करें'],
                        

                        }
                    )
                    return res.json(res_object)

                } else {

                    await Invoice.update({ status: 'paid' }, { where: { payment_id } })

                    //if paid, or trial


                    await Subscription.update({ planId, paid_to }, { where: { userInfoId } })

                    // let user = await User.findOne({ where: { id: userInfo.dataValues.userId } })

                    if (planId === 2) {
                        await LimitCounter.update({ trial_used: true }, { where: { userInfoId } })
                    }

                    await limitService.setSubscriptionLimits(planId, userInfo)

                    if (planId === 1) {
                        res_object.message = translateService.setNativeTranslate(language,
                            {
                                russian: ['Подписка отключена'],
                                english: ['Subscription disabled'],
                                spanish: ['Suscripción deshabilitada'],
                                turkish: ['Abonelik devre dışı bırakıldı'],
                                chinese: ['订阅已禁用'],
                                hindi: ['सदस्यता अक्षम की गई'],
                            
                            }
                        )
                        return res.json(res_object)
                    } else if (planId === currentPlan.dataValues.planId) {
                        res_object.message = translateService.setNativeTranslate(language,
                            {
                                russian: ['Подписка продлена'],
                                english: ['Subscription renewed'],
                                spanish: ['Suscripción extendida'],
                                turkish: ['Abonelik uzatıldı'],
                                chinese: ['订阅延长'],
                                hindi: ['सदस्यता बढ़ा दी गई'],
                            
                            }
                        )
                        return res.json(res_object)
                    } else {
                        res_object.message = translateService.setNativeTranslate(language,
                            {
                                russian: ['Подписка оформлена'],
                                english: ['Subscribed'],
                                spanish: ['Suscripción completada'],
                                turkish: ['Abonelik tamamlandı'],
                                chinese: ['认购完成'],
                                hindi: ['सदस्यता पूर्ण हुई'],
                            
                            }
                        )
                        return res.json(res_object)
                    }
                }
            } catch (e) {
                next(e)
            }
        }
        catch (e) {
            next(e)
        }
    }

    async getOne(req, res, next) {
        let subscription
        try {
            let { userInfoId } = req.query
            subscription = await Subscription.findOne({ where: { userInfoId: userInfoId } })
            return res.json(subscription)
        }
        catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

}

module.exports = new SubscriptionController()