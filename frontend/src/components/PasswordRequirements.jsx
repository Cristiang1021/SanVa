const REGLAS = [
  { key: 'minimo8', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { key: 'mayuscula', label: 'Al menos 1 mayúscula', test: (p) => /[A-Z]/.test(p) },
  { key: 'minuscula', label: 'Al menos 1 minúscula', test: (p) => /[a-z]/.test(p) },
  { key: 'numero', label: 'Al menos 1 número', test: (p) => /\d/.test(p) },
  {
    key: 'especial',
    label: 'Al menos 1 carácter especial (!@#$%^&*)',
    test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
  },
];

export default function PasswordRequirements({ password = '' }) {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {REGLAS.map((regla) => {
        const ok = regla.test(password);
        return (
          <li
            key={regla.key}
            className={`text-xs ${ok ? 'text-green-600' : 'text-gray-500'}`}
          >
            {ok ? '✓' : '○'} {regla.label}
          </li>
        );
      })}
    </ul>
  );
}
