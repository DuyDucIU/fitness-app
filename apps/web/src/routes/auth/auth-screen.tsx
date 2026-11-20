import * as React from 'react';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';

import { useAuthApi } from '@/auth/auth-context';
import { AuthFailure } from '@/auth/gateway';
import { AppShell } from '@/components/app-shell';
import { Banner } from '@/components/banner';
import { Block } from '@/components/block';
import { Alert } from '@/components/empty-state';
import { Field, PasswordInput, TextInput } from '@/components/field';
import { GoogleIcon } from '@/components/google-icon';
import { AlertIcon, MailIcon, OfflineIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useComingSoon } from '@/hooks/use-coming-soon';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { errorMessage } from '@/lib/errors';
import { formatShortDate } from '@/lib/format';
import { m } from '@/paraglide/messages.js';

import { authErrorMessage } from './auth-errors';

type Mode = 'sign-in' | 'sign-up';

/** Những gì khác nhau giữa màn đăng nhập và đăng ký. */
const MODES = {
  'sign-in': {
    title: () => m.auth_sign_in_title(),
    failed: () => m.auth_sign_in_failed(),
    submit: () => m.auth_sign_in(),
    passwordAutoComplete: 'current-password',
    switchPrompt: () => m.auth_new_here(),
    switchLabel: () => m.auth_to_sign_up(),
    switchTo: '/sign-up',
  },
  'sign-up': {
    title: () => m.auth_sign_up_title(),
    failed: () => m.auth_sign_up_failed(),
    submit: () => m.auth_create_account(),
    passwordAutoComplete: 'new-password',
    switchPrompt: () => m.auth_have_account(),
    switchLabel: () => m.auth_to_sign_in(),
    switchTo: '/sign-in',
  },
} as const;

type Fields = { email: string; password: string; confirm: string };
type FieldErrors = Partial<Record<keyof Fields, string>>;

/** Luật nhập liệu; message tạo lúc gọi để theo ngôn ngữ đang dùng. Mật khẩu ≥ 8 ký tự khớp Supabase. */
function credentialsSchema(mode: Mode) {
  const base = z.object({
    email: z.string().trim().pipe(z.email(m.auth_error_email_invalid())),
    password:
      mode === 'sign-up'
        ? z.string().min(8, m.auth_error_password_short())
        : z.string().min(1, m.auth_error_password_required()),
    confirm: z.string(),
  });
  return mode === 'sign-up'
    ? base.refine((v) => v.confirm === v.password, {
        path: ['confirm'],
        message: m.auth_error_password_mismatch(),
      })
    : base;
}

function validate(mode: Mode, fields: Fields): FieldErrors {
  const result = credentialsSchema(mode).safeParse(fields);
  const errors: FieldErrors = {};
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path[0] as keyof Fields;
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Ngày "lần trước" của khối minh hoạ: cố định, chỉ để định dạng theo ngôn ngữ. */
const EXAMPLE_LAST_DATE = new Date(2026, 10, 12);

/** Khối "bib" minh hoạ app làm gì, chỉ ở màn đăng nhập (prototypes/start). */
function ExampleBib() {
  return (
    <section
      aria-label={m.auth_example_label()}
      className="overflow-hidden rounded-md bg-tyvek"
    >
      <div className="flex min-h-14 items-center gap-2.5 bg-orange py-1.5 pr-1 pl-4 text-ink">
        <span className="min-w-0 flex-1 label-caps">
          {m.auth_example_exercise()}
        </span>
        <b className="pr-3 text-num leading-none whitespace-nowrap numeral">
          {m.auth_example_set()}
        </b>
      </div>
      <div
        aria-hidden
        className="grid grid-cols-[1fr_auto_1fr] items-end px-2 pt-4 pb-1 text-center"
      >
        <div>
          <span className="block text-bib-lg numeral">80</span>
          <span className="mt-1.5 block label-caps">{m.unit_kg()}</span>
        </div>
        <span className="px-1 pb-7 text-num leading-none numeral">×</span>
        <div>
          <span className="block text-bib-lg numeral">8</span>
          <span className="mt-1.5 block label-caps">{m.unit_reps()}</span>
        </div>
      </div>
      <div
        aria-hidden
        className="relative h-4.5 before:absolute before:inset-x-3.5 before:top-2 before:border-t-2 before:border-dashed before:border-rule"
      >
        <i className="absolute top-0 -left-2.25 size-4.5 rounded-full bg-ground" />
        <i className="absolute top-0 -right-2.25 size-4.5 rounded-full bg-ground" />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 px-4 pt-1 pb-4">
        <span className="label-caps">
          {m.auth_example_last({ date: formatShortDate(EXAMPLE_LAST_DATE) })}
        </span>
        <p className="row-span-2 leading-[1.4]">{m.auth_example_hint()}</p>
        <b className="text-num leading-none whitespace-nowrap numeral">
          {m.auth_example_last_value()}
        </b>
      </div>
    </section>
  );
}

/**
 * Màn đăng nhập / đăng ký bằng email + mật khẩu (UC01, prototypes/start). Google và
 * quên mật khẩu chưa làm: nút vẫn hiện, bấm thì báo "Coming soon".
 * Đăng nhập thành công thì `PublicOnly` tự chuyển về trang `next`.
 */
export function AuthScreen({ mode }: { mode: Mode }) {
  const auth = useAuthApi();
  const comingSoon = useComingSoon();
  const { online } = useSyncStatus();
  const [params] = useSearchParams();
  const text = MODES[mode];
  const signUp = mode === 'sign-up';
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [confirmEmail, setConfirmEmail] = React.useState(false);

  // Giữ `next` khi chuyển qua lại giữa đăng nhập và đăng ký.
  const next = params.get('next');
  const search = next ? `?next=${encodeURIComponent(next)}` : '';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);
    const errors = validate(mode, { email, password, confirm });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setBusy(true);
    try {
      if (signUp) {
        const result = await auth.signUp(email.trim(), password);
        if (result === 'confirm-email') setConfirmEmail(true);
      } else {
        await auth.signIn(email.trim(), password);
      }
    } catch (error) {
      if (error instanceof AuthFailure) {
        setFailure(authErrorMessage(error));
      } else {
        // Lỗi ngoài dự kiến (vd chưa cấu hình Supabase): chi tiết ở console.
        console.error(error);
        setFailure(errorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      top={
        <header className="flex min-h-16 items-center px-4 pt-[calc(var(--safe-top)+12px)] pb-2 font-bold">
          {m.app_name()}
        </header>
      }
    >
      {!signUp && <ExampleBib />}
      <h1 className="px-1 pt-3 text-read leading-[1.3] font-bold">
        {text.title()}
      </h1>
      {failure && (
        <Alert
          icon={<AlertIcon className="size-5" aria-hidden />}
          title={text.failed()}
        >
          {' '}
          {failure}
        </Alert>
      )}
      {confirmEmail && (
        <Alert
          icon={<MailIcon className="size-5" aria-hidden />}
          title={m.auth_confirm_email_title()}
        >
          {' '}
          {m.auth_confirm_email_body()}
        </Alert>
      )}
      <Block pad>
        <Button variant="line" size="wide" onClick={comingSoon}>
          <GoogleIcon />
          {m.auth_continue_google()}
        </Button>
        <div
          aria-hidden
          className="mt-3.5 mb-1 flex items-center gap-3 text-label font-bold before:flex-1 before:border-t before:border-rule after:flex-1 after:border-t after:border-rule"
        >
          {m.auth_or()}
        </div>
        <form noValidate onSubmit={submit}>
          <Field label={m.auth_email()} error={fieldErrors.email}>
            <TextInput
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={m.auth_email_placeholder()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field
            label={m.auth_password()}
            help={signUp ? m.auth_password_help() : undefined}
            error={fieldErrors.password}
          >
            <PasswordInput
              autoComplete={text.passwordAutoComplete}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {signUp && (
            <Field
              label={m.auth_confirm_password()}
              error={fieldErrors.confirm}
            >
              <PasswordInput
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          )}
          <Button type="submit" size="wide" busy={busy} className="mt-1">
            {text.submit()}
          </Button>
        </form>
        {!signUp && (
          <div className="mt-2 text-center">
            <Button variant="text" onClick={comingSoon}>
              {m.auth_forgot_password()}
            </Button>
          </div>
        )}
      </Block>
      <p className="text-center">
        {text.switchPrompt()}{' '}
        <Button asChild variant="text">
          <Link to={`${text.switchTo}${search}`} replace>
            {text.switchLabel()}
          </Link>
        </Button>
      </p>
      {!online && (
        <Banner
          icon={<OfflineIcon aria-hidden />}
          title={m.auth_offline_title()}
          className="mx-0"
        >
          {m.auth_offline_body()}
        </Banner>
      )}
    </AppShell>
  );
}

export function SignInPage() {
  return <AuthScreen mode="sign-in" />;
}

export function SignUpPage() {
  return <AuthScreen mode="sign-up" />;
}
