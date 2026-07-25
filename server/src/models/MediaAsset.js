import mongoose from 'mongoose'

/**
 * Médias persistés en MongoDB.
 * Sur Render le disque est éphémère : sans ça, les /uploads/... disparaissent au redéploiement.
 */
const mediaAssetSchema = new mongoose.Schema(
  {
    /** Clé publique, ex. "audio/123.mp3" ou "images/456.jpg" */
    key: { type: String, required: true, unique: true, index: true },
    filename: { type: String, required: true },
    kind: {
      type: String,
      enum: ['audio', 'images', 'vehicles'],
      required: true,
      index: true,
    },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
)

export const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema)
