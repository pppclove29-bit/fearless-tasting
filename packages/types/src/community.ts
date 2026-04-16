/** 게시판 */
export interface Board {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 게시판 목록 항목 (게시글 수 포함) */
export interface BoardListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count: { posts: number };
}

/** 게시글 작성자 */
export interface PostAuthor {
  id: string;
  nickname: string;
  profileImageUrl: string | null;
}

/** 게시글 목록 항목 */
export interface PostListItem {
  id: string;
  title: string;
  content: string;
  boardSlug: string;
  boardName: string;
  author: PostAuthor;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number; likes: number };
}

/** 페이지네이션된 게시글 목록 */
export interface PaginatedPosts {
  items: PostListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 댓글 */
export interface PostComment {
  id: string;
  content: string;
  author: PostAuthor;
  createdAt: string;
}

/** 게시글 상세 */
export interface PostDetail {
  id: string;
  title: string;
  content: string;
  boardId: string;
  author: PostAuthor;
  comments: PostComment[];
  _count?: { likes?: number };
  createdAt: string;
  updatedAt: string;
}
