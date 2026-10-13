-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
--{{roles}}     "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

--{{refresh}} -- CreateTable
--{{refresh}} CREATE TABLE "RefreshToken" (
--{{refresh}}     "id" TEXT NOT NULL,
--{{refresh}}     "tokenHash" TEXT NOT NULL,
--{{refresh}}     "userId" TEXT NOT NULL,
--{{refresh}}     "familyId" TEXT NOT NULL,
--{{refresh}}     "expiresAt" TIMESTAMP(3) NOT NULL,
--{{refresh}}     "revokedAt" TIMESTAMP(3),
--{{refresh}}     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--{{refresh}}     CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
--{{refresh}} );

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

--{{refresh}} -- CreateIndex
--{{refresh}} CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

--{{refresh}} -- CreateIndex
--{{refresh}} CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

--{{refresh}} -- CreateIndex
--{{refresh}} CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

--{{refresh}} -- AddForeignKey
--{{refresh}} ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
