
export const generateQRData = (bookingRef: string, passengerName: string, route: string, date: string) => {
  const verificationData = {
    bookingRef,
    passengerName,
    route,
    date,
    timestamp: Date.now(),
    verified: true
  };
  
  return JSON.stringify(verificationData);
};

export const verifyQRData = (qrData: string) => {
  try {
    const data = JSON.parse(qrData);
    return data.verified === true && data.bookingRef && data.passengerName;
  } catch {
    return false;
  }
};
