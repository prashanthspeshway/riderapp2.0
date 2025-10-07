// Script to manually create riders from users collection data
// This will create the riders in the riders collection

const rider1Data = {
  firstName: "rider1",
  lastName: "",
  email: "rider1@gmail.com",
  mobile: "8989898989",
  panNumber: "NOT_PROVIDED",
  aadharNumber: "NOT_PROVIDED", 
  licenseNumber: "NOT_PROVIDED",
  vehicleNumber: "NOT_PROVIDED",
  status: "approved",
  documents: {
    panDocument: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758967387/rider_docs/mpstohpeef0t3csrqtjo.png",
    aadharFront: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758967383/rider_docs/ybxoxjm8fupf1gqis43y.png",
    aadharBack: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758967385/rider_docs/m8tmqin0hfhwpnwgsvgs.png",
    license: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758967386/rider_docs/scaw6dlayiuamghpu9lz.png",
    rc: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758967388/rider_docs/qohqmjzpkqsqzn9wpcjy.png"
  },
  adminNotes: "Migrated from users collection - approved",
  approvedBy: "migration",
  approvedAt: "2025-09-27T10:03:10.498Z"
};

const prashanthData = {
  firstName: "prashanth",
  lastName: "",
  email: "prashanth@gmail.com", 
  mobile: "7878787878",
  panNumber: "NOT_PROVIDED",
  aadharNumber: "NOT_PROVIDED",
  licenseNumber: "NOT_PROVIDED", 
  vehicleNumber: "NOT_PROVIDED",
  status: "approved",
  documents: {
    panDocument: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758866386/rider_docs/q44hhjnlh373iichtfnc.png",
    aadharFront: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758866383/rider_docs/y0sdbg7zhhtcozga4gvx.png",
    aadharBack: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758866384/rider_docs/aznu4ntl8b1u5gnskeg2.png",
    license: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758866385/rider_docs/mpvrhdwhr57ryl1xu4yz.png",
    rc: "https://res.cloudinary.com/dyxavd1yt/image/upload/v1758866387/rider_docs/axkkswh5o2osqp49hpsg.png"
  },
  adminNotes: "Migrated from users collection - approved",
  approvedBy: "migration", 
  approvedAt: "2025-09-26T05:59:49.381Z"
};

console.log("Rider 1 Data:", JSON.stringify(rider1Data, null, 2));
console.log("\nPrashanth Data:", JSON.stringify(prashanthData, null, 2));
