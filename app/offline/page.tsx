import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Нет подключения — ВолонтёрКР',
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Image
        src="/logo.png"
        alt="ВолонтёрКР"
        width={96}
        height={96}
        className="h-24 w-auto opacity-90"
        priority
      />
      <h1 className="text-2xl font-bold text-gray-900">Нет подключения к интернету</h1>
      <p className="max-w-md text-gray-600">
        Похоже, вы офлайн. Уже открытые страницы доступны без сети — остальное
        загрузится, как только соединение восстановится.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700"
      >
        На главную
      </Link>
    </main>
  )
}
