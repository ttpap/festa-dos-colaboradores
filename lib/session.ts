import { getIronSession, type SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

interface SessionData {
  isAdmin?: boolean
}

const sessionOptions: SessionOptions = {
  cookieName: 'festa_admin',
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 12, // 12 hours
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
