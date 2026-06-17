interface ProfileBuilderV2Props {
  profileId: string;
}

export function ProfileBuilderV2({ profileId }: ProfileBuilderV2Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Profile Builder v2</p>
          <p className="text-xs text-muted-foreground">{profileId}</p>
        </div>
      </div>
    </div>
  );
}
