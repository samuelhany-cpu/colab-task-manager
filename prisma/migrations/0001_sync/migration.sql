    -- AlterTable

    -- CreateTable
    CREATE TABLE "FileVersion" (
        "id" TEXT NOT NULL,
        "fileId" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "originalName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "size" INTEGER NOT NULL,
        "versionNumber" INTEGER NOT NULL,
        "uploadedById" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "FileVersion_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "MessageRead" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "messageId" TEXT NOT NULL,
        "projectId" TEXT,
        "receiverId" TEXT,
        "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
    );

    -- CreateIndex
    CREATE UNIQUE INDEX "FileVersion_key_key" ON "FileVersion"("key");

    -- CreateIndex
    CREATE UNIQUE INDEX "MessageRead_userId_projectId_key" ON "MessageRead"("userId", "projectId");

    -- CreateIndex
    CREATE UNIQUE INDEX "MessageRead_userId_receiverId_key" ON "MessageRead"("userId", "receiverId");

    -- AddForeignKey
    ALTER TABLE "FileVersion" ADD CONSTRAINT "FileVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "FileVersion" ADD CONSTRAINT "FileVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

