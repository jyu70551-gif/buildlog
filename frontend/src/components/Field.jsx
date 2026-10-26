import { useId } from 'react'

// 라벨, 입력칸, 항목별 안내를 한 묶음으로 보여주는 공통 입력 항목
export default function Field({ label, error, hint, ...inputProps }) {
  const id = useId()
  const messageId = `${id}-message`

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={messageId} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
