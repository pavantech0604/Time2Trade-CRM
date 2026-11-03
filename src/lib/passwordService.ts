type AuthClient = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
    updateUser: (attributes: { password: string }) => Promise<{ error: { message: string } | null }>;
  };
};

export async function saveAuthPassword(client: AuthClient, userId: string, password: string): Promise<void> {
  if (password.length < 6) throw new Error('Password must contain at least 6 characters.');
  const { data, error: sessionError } = await client.auth.getUser();
  if (sessionError || data.user?.id !== userId) {
    throw new Error('Your session has expired. Sign in again before changing your password.');
  }
  // Pass the password unchanged; T2T@ is ordinary password text.
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
