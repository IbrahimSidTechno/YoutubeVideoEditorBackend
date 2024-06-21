import mongoose from "mongoose";

const { Schema } = mongoose;

const DownloadStatisticSchema = new Schema(
  {
    downloadedlink: { type: String, required: true },
    filename: { type: String, required: true },
    isPublished: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const DownloadStatistic = mongoose.model('DownloadStatistic', DownloadStatisticSchema);

export default DownloadStatistic;
