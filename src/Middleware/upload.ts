// middlewares/upload.ts
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars')

// Garante que o diretório existe
fs.mkdirSync(uploadDir, { recursive: true })

export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, fileName)
  },
})

export const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Formato de imagem inválido.'))
    }
  },
})
