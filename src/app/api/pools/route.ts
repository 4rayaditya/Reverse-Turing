import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const pools = await prisma.pool.findMany({
    where: {
      status: { in: ["waiting", "active"] },
    },
    select: {
      id: true,
      name: true,
      status: true,
      _count: {
        select: { users: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(pools)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, email: true }
  })

  if (!user?.isAdmin && user?.email !== "ray@gmail.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name } = await req.json()

  const pool = await prisma.pool.create({
    data: {
      name,
      status: "waiting",
    },
  })

  return NextResponse.json(pool)
}
