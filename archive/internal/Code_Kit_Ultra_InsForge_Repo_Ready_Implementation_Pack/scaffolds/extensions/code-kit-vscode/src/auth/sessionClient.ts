export interface SessionResponse {
  actorId: string;
  organizationId?: string;
  workspaceId?: string;
  projectId?: string;
  permissions: string[];
}

export async function fetchSession(
  controlServiceUrl: string,
  accessToken: string,
): Promise<SessionResponse> {
  const response = await fetch(`${controlServiceUrl}/v1/session`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Session request failed: ${response.status}`);
  }

  return (await response.json()) as SessionResponse;
}
