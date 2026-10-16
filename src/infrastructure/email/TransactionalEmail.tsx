// src/infrastructure/email/TransactionalEmail.tsx
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { CSSProperties } from 'react';

export type EmailDetailRow = { label: string; value: string };
export type EmailAction = { label: string; url: string; primary?: boolean };

export type TransactionalEmailProps = {
  lang: string;
  preview: string;
  heading: string;
  greeting?: string;
  paragraphs?: string[];
  details?: EmailDetailRow[];
  note?: string;
  actionsIntro?: string;
  actions?: EmailAction[];
  footer: string;
};

/**
 * Gabarit unique des emails transactionnels : tout le texte arrive déjà traduit, ce composant ne fait
 * que de la mise en page. Styles en ligne (les clients mail ignorent les feuilles de style) et largeur
 * fluide pour le mobile.
 */
export function TransactionalEmail({
  lang,
  preview,
  heading,
  greeting,
  paragraphs = [],
  details = [],
  note,
  actionsIntro,
  actions = [],
  footer,
}: TransactionalEmailProps) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1" style={styles.heading}>
            {heading}
          </Heading>

          {greeting && <Text style={styles.text}>{greeting}</Text>}
          {paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.text}>
              {paragraph}
            </Text>
          ))}

          {details.length > 0 && (
            <Section style={styles.card}>
              {details.map((row) => (
                <Text key={`${row.label}:${row.value}`} style={styles.detail}>
                  <span style={styles.detailLabel}>{row.label}</span>
                  <br />
                  {/* pre-wrap : un message saisi sur plusieurs lignes garde ses retours à la ligne. */}
                  <span style={styles.detailValue}>{row.value}</span>
                </Text>
              ))}
            </Section>
          )}

          {note && <Text style={styles.muted}>{note}</Text>}

          {actions.length > 0 && (
            <Section style={styles.actions}>
              {actionsIntro && <Text style={styles.text}>{actionsIntro}</Text>}
              {actions.map((action) => (
                <Button
                  key={action.url}
                  href={action.url}
                  style={action.primary ? styles.buttonPrimary : styles.buttonSecondary}
                >
                  {action.label}
                </Button>
              ))}
            </Section>
          )}

          <Hr style={styles.hr} />
          <Text style={styles.footer}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const INK = '#1e293b';
const ACCENT = '#ea580c';

const button: CSSProperties = {
  display: 'inline-block',
  padding: '12px 22px',
  marginRight: '8px',
  marginBottom: '8px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
};

const styles = {
  body: { backgroundColor: '#f1f5f9', margin: 0, padding: '24px 0', fontFamily: FONT },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '32px 28px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
  },
  heading: { margin: '0 0 20px', fontSize: '24px', lineHeight: '32px', color: INK },
  text: { margin: '0 0 14px', fontSize: '15px', lineHeight: '24px', color: '#334155' },
  card: { margin: '20px 0', padding: '8px 16px', backgroundColor: '#f8fafc', borderRadius: '6px' },
  detail: { margin: '10px 0', fontSize: '15px', lineHeight: '22px', color: INK },
  detailLabel: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' },
  detailValue: { whiteSpace: 'pre-wrap' },
  muted: { margin: '0 0 14px', fontSize: '13px', lineHeight: '20px', color: '#64748b' },
  actions: { margin: '24px 0 8px' },
  buttonPrimary: { ...button, backgroundColor: ACCENT, color: '#ffffff' },
  buttonSecondary: { ...button, backgroundColor: '#ffffff', color: INK, border: '1px solid #cbd5e1' },
  hr: { margin: '28px 0 16px', borderColor: '#e2e8f0' },
  footer: { margin: 0, fontSize: '12px', lineHeight: '18px', color: '#94a3b8' },
} satisfies Record<string, CSSProperties>;
