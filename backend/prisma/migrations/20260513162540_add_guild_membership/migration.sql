-- CreateTable
CREATE TABLE "GuildAccessRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "appRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildAccessRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMembership" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildAccessRole_guildId_appRole_idx" ON "GuildAccessRole"("guildId", "appRole");

-- CreateIndex
CREATE UNIQUE INDEX "GuildAccessRole_guildId_roleName_appRole_key" ON "GuildAccessRole"("guildId", "roleName", "appRole");

-- CreateIndex
CREATE INDEX "GuildMembership_userId_role_idx" ON "GuildMembership"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMembership_guildId_userId_key" ON "GuildMembership"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "GuildAccessRole" ADD CONSTRAINT "GuildAccessRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
