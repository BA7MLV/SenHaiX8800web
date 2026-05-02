import './i18n';
import i18n from './i18n';
import { I18nextProvider } from 'react-i18next';
import App from './App';

export function Root() {
  return (
    <I18nextProvider i18n={i18n}>
      <App currentTheme="light" onToggleTheme={() => {}} />
    </I18nextProvider>
  );
}
