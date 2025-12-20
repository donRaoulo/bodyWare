import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email?.toString().toLowerCase().trim();
    const password = body?.password?.toString();
    const name = body?.name?.toString().trim() || null;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email und Passwort sind erforderlich' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Passwort muss mindestens 6 Zeichen haben' }, { status: 400 });
    }

    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ success: false, error: 'E-Mail wird bereits verwendet' }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(id, name, email, passwordHash);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error during signup:', error);
    return NextResponse.json({ success: false, error: 'Registrierung fehlgeschlagen' }, { status: 500 });
  }
}
