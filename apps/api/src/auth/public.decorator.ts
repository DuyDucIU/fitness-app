import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Đánh dấu route không cần JWT (mặc định mọi route đều cần). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
