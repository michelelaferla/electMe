import {useEffect, useState} from 'react';
import {useAuth} from './hooks/useAuth';
import {LoginPage} from './pages/LoginPage';
import {ElectionsPage} from './pages/ElectionsPage';
import {BallotPage} from './pages/BallotPage';
import {VoteConfirmationPage} from './pages/VoteConfirmationPage';
import type {Election} from './types/domain';
import {LanguageProvider, useLanguage} from './i18n/LanguageContext';
import {LanguageSelector} from './components/LanguageSelector';

const CONTRAST_STORAGE_KEY = 'electme-high-contrast';

function AppContent() {
  const { user, loading } = useAuth();
    const {t} = useLanguage();
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [highContrast, setHighContrast] = useState(() => localStorage.getItem(CONTRAST_STORAGE_KEY) === 'true');

    useEffect(() => {
        document.documentElement.dataset.contrast = highContrast ? 'high' : 'standard';
        localStorage.setItem(CONTRAST_STORAGE_KEY, String(highContrast));
    }, [highContrast]);

    const toolbar = (
        <div className="accessibilityToolbar" aria-label="Accessibility and language options">
            <LanguageSelector/>
            <button
                type="button"
                className="accessibilityToggle"
                onClick={() => setHighContrast(value => !value)}
                aria-pressed={highContrast}
                aria-label={highContrast ? t('accessibility.highContrast.disableLabel') : t('accessibility.highContrast.enableLabel')}
            >
                {highContrast ? t('accessibility.highContrast.disable') : t('accessibility.highContrast.enable')}
            </button>
        </div>
    );

    if (loading) return <>{toolbar}
        <main className="centerPage">{t('app.loading')}</main>
    </>;
    if (!user) return <>{toolbar}<LoginPage/></>;
    if (showConfirmation) {
        return <>{toolbar}<VoteConfirmationPage onBackToElections={() => setShowConfirmation(false)}/></>;
    }
    if (selectedElection) {
        return <>{toolbar}<BallotPage election={selectedElection} onBack={() => setSelectedElection(null)}
                                      onSubmitted={() => {
                                          setSelectedElection(null);
                                          setShowConfirmation(true);
                                      }}/></>;
    }
    return <>{toolbar}<ElectionsPage onSelect={setSelectedElection}/></>;
}

export default function App() {
    return <LanguageProvider><AppContent/></LanguageProvider>;
}
