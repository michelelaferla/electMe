import {useLanguage} from '../i18n/LanguageContext';

type Props = {
    onBackToElections: () => void;
};

export function VoteConfirmationPage({onBackToElections}: Props) {
    const {t} = useLanguage();

    return (
        <main className="page confirmationPage">
            <section className="card confirmationCard" role="status" aria-live="polite">
                <div className="confirmationIcon" aria-hidden="true">✓</div>
                <h1>{t('confirmation.title')}</h1>
                <p>{t('confirmation.message')}</p>
                <button type="button" className="submit" onClick={onBackToElections}>
                    {t('confirmation.backToElections')}
                </button>
            </section>
        </main>
    );
}
