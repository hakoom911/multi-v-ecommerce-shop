import { prisma } from "@packages/libs/prisma";
import { Prisma } from "@prisma/client";

export async function findUserByEmail(email: string) {
    try {
        return await prisma.users.findUnique({ where: { email } })
    } catch (err) {
        console.error("Error while find user by email", err);
        return null
    }
}

export async function createUser(data: Prisma.usersCreateInput) {
    try {
        return await prisma.users.create({ data })
    } catch (err) {
        throw new Error(`Error while creating user, ${(err as Error).message}`)
    }
}

export async function updateUser(field: "id" | "email", value: string, data: Prisma.usersUpdateInput) {
    try {
        const f = field === "email" ? { email: value } : { id: value };
        return await prisma.users.update({ where: { ...f }, data })
    } catch (err) {
        throw new Error(`Error while updating user, ${(err as Error).message}`)
    }
}