import { PrismaClient, PinRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default PINs (should be changed by admin)
  await prisma.pin.createMany({
    data: [
      { pinNumber: '1111', role: PinRole.ADMIN },
      { pinNumber: '2222', role: PinRole.EXPENSE_INVENTORY },
      { pinNumber: '3333', role: PinRole.INVENTORY_ONLY },
    ],
    skipDuplicates: true,
  })

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
