import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context';

type AuthMode = 'login' | 'register';

export interface AuthProps {
  initialMode?: AuthMode;
}

interface AuthFieldProps {
  id: string;
  label: string;
  icon: string;
  value: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
  trailing?: React.ReactNode;
}

const AuthField: React.FC<AuthFieldProps> = ({
  id,
  label,
  icon,
  value,
  type = 'text',
  placeholder,
  autoComplete,
  onChange,
  trailing,
}) => (
  <div>
    <label
      htmlFor={id}
      className="mb-2 block text-[11px] font-label font-semibold uppercase tracking-[0.14em] text-on-surface-variant"
    >
      {label}
    </label>
    <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 transition-all focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
      <span className="material-symbols-outlined select-none text-[20px] text-outline">{icon}</span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent font-body text-sm text-on-surface placeholder:text-outline/60 focus:outline-none"
      />
      {trailing}
    </div>
  </div>
);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const friendlyError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid credentials')) {
    return 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
  }
  if (normalized.includes('already registered') || normalized.includes('conflict')) {
    return 'Email này đã được sử dụng. Hãy đăng nhập hoặc dùng email khác.';
  }
  if (normalized.includes('not authenticated')) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
  }
  return message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
};

const benefits = [
  {
    icon: 'auto_stories',
    title: 'Không gian đọc của riêng bạn',
    description: 'Lưu lại tủ sách, tiến độ và nhịp đọc yêu thích.',
  },
  {
    icon: 'visibility',
    title: 'Thiết kế dịu mắt',
    description: 'Bố cục và độ tương phản tối ưu cho những buổi đọc dài.',
  },
  {
    icon: 'verified_user',
    title: 'Riêng tư và an toàn',
    description: 'Tài khoản được bảo vệ bằng mật khẩu mã hóa hiện đại.',
  },
];

export const Auth: React.FC<AuthProps> = ({ initialMode = 'login' }) => {
  const { user, isLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    if (!isLoading && user) navigate(redirectTo, { replace: true });
  }, [isLoading, user, navigate, redirectTo]);

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    navigate(nextMode === 'login' ? '/login' : '/register', { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || isLoading) return;

    setError('');
    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setError('Vui lòng nhập một địa chỉ email hợp lệ.');
      return;
    }
    if (mode === 'register' && !fullName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError('Mật khẩu cần có ít nhất 8 ký tự.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(normalizedEmail, fullName.trim(), password);
      } else {
        await login(normalizedEmail, password);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-texture font-body text-on-surface antialiased">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#062354] px-14 py-12 text-white lg:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                'radial-gradient(circle at 18% 12%, rgba(249,227,122,0.2), transparent 42%), radial-gradient(circle at 88% 24%, rgba(51,102,204,0.5), transparent 55%), radial-gradient(circle at 45% 105%, rgba(9,76,178,0.65), transparent 58%)',
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 select-none">
              <span className="font-headline text-2xl font-semibold tracking-normal text-white">
                LexiEase
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary-fixed" />
            </Link>

            <h2 className="mt-16 max-w-md font-headline text-4xl leading-[1.2] text-white">
              Mỗi trang sách,
              <br />
              <em className="text-tertiary-fixed">một nhịp thở.</em>
            </h2>
            <p className="mt-5 max-w-sm font-body text-sm font-light leading-relaxed text-white/65">
              LexiEase giữ cho trải nghiệm đọc của bạn liền mạch, tĩnh tại và luôn ở bên bạn trên mọi
              thiết bị.
            </p>
          </div>

          <div className="relative z-10 space-y-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <span className="material-symbols-outlined text-[30px] text-tertiary-fixed">
                format_quote
              </span>
              <p className="mt-3 font-headline text-lg italic leading-relaxed text-white/90">
                “Con chữ chỉ thực sự sống động khi tâm trí được phép nghỉ ngơi.”
              </p>
              <p className="mt-4 text-[10px] font-label uppercase tracking-[0.24em] text-white/45">
                Tuyên ngôn LexiEase
              </p>
            </div>

            <ul className="space-y-4">
              {benefits.map((benefit) => (
                <li key={benefit.icon} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-tertiary-fixed">
                    <span className="material-symbols-outlined text-[18px]">{benefit.icon}</span>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{benefit.title}</p>
                    <p className="mt-0.5 text-xs font-light leading-relaxed text-white/55">
                      {benefit.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[11px] font-label text-white/45">
            <span>© 2025 LexiEase</span>
            <span>Đọc chậm. Nghĩ sâu.</span>
          </div>
        </aside>

        <main className="relative flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-14">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[11px] font-label uppercase tracking-[0.16em] text-on-surface-variant transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Về trang chủ
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 select-none lg:hidden">
              <span className="font-headline text-xl font-semibold text-on-surface">LexiEase</span>
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[430px]">
              <div className="rounded-[2rem] border border-white/70 bg-surface-container-lowest/95 p-7 shadow-editorial backdrop-blur-sm sm:p-9">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-[10px] font-label font-semibold uppercase tracking-[0.18em] text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                  {mode === 'login' ? 'Chào mừng trở lại' : 'Bắt đầu hành trình'}
                </div>

                <h1 className="mt-5 font-headline text-3xl font-semibold tracking-tight text-on-surface sm:text-[2rem]">
                  {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                </h1>
                <p className="mt-2 text-sm font-light leading-relaxed text-on-surface-variant">
                  {mode === 'login'
                    ? 'Tiếp tục không gian đọc êm dịu và những trang sách đang dang dở.'
                    : 'Chỉ mất một phút để lưu giữ tủ sách và nhịp đọc riêng của bạn.'}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-surface-container/70 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`rounded-xl px-4 py-2.5 text-sm font-label font-medium transition-all ${
                      mode === 'login'
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`rounded-xl px-4 py-2.5 text-sm font-label font-medium transition-all ${
                      mode === 'register'
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Đăng ký
                  </button>
                </div>

                {error && (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-error/15 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
                    <span className="material-symbols-outlined mt-0.5 text-[18px]">error</span>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                )}

                <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {mode === 'register' && (
                    <AuthField
                      id="full-name"
                      label="Họ và tên"
                      icon="badge"
                      value={fullName}
                      placeholder="Nguyễn Minh Anh"
                      autoComplete="name"
                      onChange={(value) => {
                        setFullName(value);
                        setError('');
                      }}
                    />
                  )}

                  <AuthField
                    id="email"
                    label="Email"
                    icon="mail"
                    type="email"
                    value={email}
                    placeholder="ban@example.com"
                    autoComplete="email"
                    onChange={(value) => {
                      setEmail(value);
                      setError('');
                    }}
                  />

                  <AuthField
                    id="password"
                    label="Mật khẩu"
                    icon="lock"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder={mode === 'register' ? 'Tối thiểu 8 ký tự' : 'Nhập mật khẩu'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    onChange={(value) => {
                      setPassword(value);
                      setError('');
                    }}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        className="text-outline transition-colors hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    }
                  />

                  {mode === 'register' && (
                    <AuthField
                      id="confirm-password"
                      label="Xác nhận mật khẩu"
                      icon="lock_reset"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      placeholder="Nhập lại mật khẩu"
                      autoComplete="new-password"
                      onChange={(value) => {
                        setConfirmPassword(value);
                        setError('');
                      }}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((current) => !current)}
                          aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          className="text-outline transition-colors hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      }
                    />
                  )}

                  <button
                    type="submit"
                    disabled={submitting || isLoading}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-container px-6 py-3.5 text-sm font-label font-medium text-on-primary shadow-sm transition-all hover:shadow-md active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center font-body text-sm text-on-surface-variant">
                  {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
                  </button>
                </p>
              </div>

              <p className="mt-5 px-4 text-center text-[11px] font-label leading-relaxed text-outline">
                Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật của
                LexiEase.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
