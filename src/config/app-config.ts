import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Studio Admin",
  version: packageJson.version,
  copyright: `© ${currentYear}, MyHome.`,
  meta: {
    title: "MyHome - Platform Pemesanan Kos Modern, Mudah, dan Terpercaya",
    description:
      "Temukan kos terbaik dengan mudah bersama MyHome. Jelajahi pilihan kos berkualitas, lihat fasilitas lengkap, bandingkan harga, dan pesan hunian yang paling cocok untuk kebutuhanmu dalam satu platform.",
},
};
