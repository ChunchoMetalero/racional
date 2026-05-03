import { AlertCircle, WifiOff, FileQuestion } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  error: Error;
}

export function ErrorState({ error }: ErrorStateProps) {
  const isNotFound = error.message === 'DOCUMENT_NOT_FOUND';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
          {isNotFound ? (
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          ) : (
            <WifiOff className="h-12 w-12 text-destructive" />
          )}

          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              {isNotFound ? 'Portafolio no encontrado' : 'Error de conexión'}
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">
            {isNotFound
              ? 'No encontramos datos para este portafolio. El documento puede no haberse creado aún.'
              : `Error al conectar con Firestore. Verificá tu red e intentá de nuevo.`}
          </p>

          {!isNotFound && (
            <p className="text-xs text-muted-foreground/60 font-mono bg-muted px-3 py-1 rounded">
              {error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
