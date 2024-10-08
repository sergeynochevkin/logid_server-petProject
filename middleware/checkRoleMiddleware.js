const jwt = require('jsonwebtoken')
const translateService = require('../service/translate_service')

module.exports = function (role) {
    return function (req, res, next) {
        if (req.method === "OPTIONS") {
            next()
        }
        try {
            const token = req.headers.authorization.split(' ')[1]

            if (!token) {
                return res.status(401).json({
                    message: translateService.setNativeTranslate('english',
                        {
                            russian: ['Пользователь не авторизован'],
                            english: ['User not authorized'],
                            spanish: ['El usuario no está autorizado'],
                            turkish: ['Kullanıcının yetkisi yoktur'],
                            chinese: ['用户未获得授权'],
                            hindi: ['प्रयोक्ता अधिकृत नहीं है'],
                        }
                    )
                })
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

            if (decoded.role !== role) {
                return res.status(403).json({
                    message: translateService.setNativeTranslate('english',
                        {
                            russian: ['Нет прав на изменения'],
                            english: ['No rights to change'],
                            spanish: ['Sin derecho a cambiar'],
                            turkish: ['Değiştirme hakkı yok'],
                            chinese: ['无权更改'],
                            hindi: ['बदलने का कोई अधिकार नहीं'],
                        }
                    )
                })
            }
            req.user = decoded
            next()
        }
        catch (e) {
            res.status(401).json({
                message: e
            })
        }
    }
}









