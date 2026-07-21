/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    session: {
      userId: number;
      email: string;
      expiresAt: Date;
    } | null;
  }
}