import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Veritabanı kontrol ediliyor...");

  // ARTIK E-MAIL DEĞİL, ID KONTROLÜ YAPIYORUZ
  const user = await prisma.user.upsert({
    where: { id: 1 }, // 1 numaralı koltuk dolu mu diye bak?
    update: {},       // Doluysa hiçbir şey yapma, dokunma.
    create: {         // Boşsa bu kullanıcıyı yarat.
      id: 1,
      email: 'test@student.com',
      password: 'sifre',
      name: 'Efekan (Öğrenci)',
    },
  });

  console.log(`✅ 1 Numaralı Kullanıcı Hazır: ${user.name}`);
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });