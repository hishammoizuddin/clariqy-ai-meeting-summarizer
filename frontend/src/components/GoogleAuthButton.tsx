import { GoogleLogin } from '@react-oauth/google'

type Props = {
  onCredential: (credential: string) => void
  onError?: () => void
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/** True when Google sign-in is configured — use to conditionally show dividers etc. */
export const hasGoogleAuth = Boolean(CLIENT_ID)

/**
 * Renders Google's official "Sign in with Google" button.
 * Returns null when VITE_GOOGLE_CLIENT_ID is not configured, so email/password
 * auth keeps working unchanged until Google is set up.
 */
export default function GoogleAuthButton({ onCredential, onError, text = 'continue_with' }: Props) {
  if (!CLIENT_ID) return null

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        text={text}
        shape="pill"
        size="large"
        logo_alignment="center"
        onSuccess={(resp) => {
          if (resp.credential) onCredential(resp.credential)
          else onError?.()
        }}
        onError={() => onError?.()}
      />
    </div>
  )
}
