// Vietnamese font support for jsPDF
// Using Roboto font which has good Vietnamese character support

export const ROBOTO_NORMAL_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf";
export const ROBOTO_BOLD_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf";

export async function loadRobotoFont(): Promise<{ normal: ArrayBuffer; bold: ArrayBuffer }> {
  const [normalResponse, boldResponse] = await Promise.all([
    fetch(ROBOTO_NORMAL_URL),
    fetch(ROBOTO_BOLD_URL)
  ]);
  
  return {
    normal: await normalResponse.arrayBuffer(),
    bold: await boldResponse.arrayBuffer()
  };
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
