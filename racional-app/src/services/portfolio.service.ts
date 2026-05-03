import { type Firestore, doc, onSnapshot } from 'firebase/firestore';
import type { PortfolioEvolutionDocument } from '@/types/portfolio';

export function subscribeToPortfolioEvolution(
  db: Firestore,
  userId: string,
  onChange: (data: PortfolioEvolutionDocument) => void,
  onError: (err: Error) => void,
) {
  const ref = doc(db, 'investmentEvolutions', userId);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onError(new Error('DOCUMENT_NOT_FOUND'));
        return;
      }
      onChange(snapshot.data() as PortfolioEvolutionDocument);
    },
    (err) => onError(err),
  );
}
