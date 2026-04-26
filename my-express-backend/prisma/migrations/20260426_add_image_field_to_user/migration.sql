-- Add image field to users table for profile picture storage (ImgBB URLs)
ALTER TABLE "users" ADD COLUMN "profile_image" TEXT;
