import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Handle Prisma client not being generated during build
let prismaInstance: PrismaClient | undefined

try {
  prismaInstance = globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // Optimize for Supabase connection pooling
      datasources: {
        db: {
          url: process.env.POSTGRES_PRISMA_URL,
        },
      },
    })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance

  // Gracefully close Prisma connection on shutdown
  if (process.env.NODE_ENV === 'production') {
    process.on('beforeExit', async () => {
      await prismaInstance?.$disconnect()
    })
  }
} catch (error) {
  console.warn('Prisma client not initialized. Using Supabase client instead.')
  prismaInstance = undefined
}

export const prisma = prismaInstance as PrismaClient
