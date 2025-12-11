import { useQuery } from "@tanstack/react-query";

interface FarcasterUser {
  username: string;
  pfpUrl?: string;
}

export function useFarcasterUsers(addresses: string[]) {
  const uniqueAddresses = [...new Set(addresses.filter(Boolean).map(a => a.toLowerCase()))];
  
  return useQuery<Record<string, FarcasterUser>>({
    queryKey: ['/api/farcaster/users', uniqueAddresses.join(',')],
    queryFn: async () => {
      if (uniqueAddresses.length === 0) return {};
      const response = await fetch(`/api/farcaster/users?addresses=${uniqueAddresses.join(',')}`);
      if (!response.ok) return {};
      return response.json();
    },
    enabled: uniqueAddresses.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function formatDisplayName(
  address: string, 
  users: Record<string, FarcasterUser> | undefined
): string {
  if (!address) return "";
  const lowerAddr = address.toLowerCase();
  const user = users?.[lowerAddr];
  if (user?.username) {
    return `@${user.username}`;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
