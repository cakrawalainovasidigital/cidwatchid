-- CreateTable
CREATE TABLE "UserApiToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "hashToken" TEXT NOT NULL
);
