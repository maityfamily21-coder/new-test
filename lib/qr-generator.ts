import QRCode from "qrcode"

export async function generateQRCode(data: any): Promise<string> {
  try {
    const qrCode = await QRCode.toDataURL(JSON.stringify(data), {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 300,
    })
    return qrCode
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Failed to generate QR code")
  }
}

export function parseQRData(qrString: string): any {
  try {
    return JSON.parse(qrString)
  } catch (error) {
    console.error("Error parsing QR data:", error)
    throw new Error("Invalid QR code format")
  }
}
