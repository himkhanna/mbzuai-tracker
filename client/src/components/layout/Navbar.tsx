import NotificationBell from './NotificationBell';

interface NavbarProps {
  title: string;
}

export default function Navbar({ title }: NavbarProps) {
  return (
    <header
      className="sticky top-0 z-30 px-6 py-3 flex items-center justify-between shrink-0"
      style={{
        background: 'var(--mbzuai-gold)',
        borderBottom: '1px solid var(--mbzuai-gold-dark)',
      }}
    >
      <h1
        className="text-base font-semibold"
        style={{ color: 'var(--mbzuai-navy)' }}
      >
        {title}
      </h1>
      <NotificationBell />
    </header>
  );
}
