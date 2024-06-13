import mongoose from "mongoose";


const DownloadStatisticSchema = new mongoose.Schema(
  {
    downloadedlink: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('downloadstatistics', DownloadStatisticSchema);