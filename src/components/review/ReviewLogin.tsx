'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReviewLoginProps {
  configured: boolean;
}

export function ReviewLogin({ configured }: ReviewLoginProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/review/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.refresh();
        return;
      }

      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Invalid password');
    } catch {
      setError('Sign-in failed. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-md rounded-2xl border border-dark-purple/10 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-ultra-violet" />
          <h1 className="mb-2 text-2xl font-bold text-dark-purple">Music introductions</h1>
          <p className="text-dark-purple/70">
            {configured
              ? 'Enter the reviewer password to browse the introductions used in the experiment.'
              : 'Reviewer access has not been set up yet. Please contact the research team.'}
          </p>
        </div>

        {configured && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="review-password" className="text-sm font-medium text-dark-purple">
                Password
              </Label>
              <Input
                id="review-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1"
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600" role="alert">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full rounded-md bg-dark-purple text-sm font-medium text-white transition-colors hover:bg-ultra-violet disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'View introductions'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
