import { useI18n } from '../i18n/useI18n';

export default function Minigame() {
  const { m } = useI18n();

  return (
    <footer className="footer-container">
      <p>{m.minigame.line1}</p>
      <p>{m.minigame.line2}</p>
    </footer>
  );
}
