import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Board CRUD (Admin) ──

  /** 게시판 생성 */
  async createBoard(name: string, slug: string, description?: string, sortOrder?: number, enabled?: boolean, popularThreshold?: number) {
    return this.prisma.write.board.create({
      data: {
        name,
        slug,
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(enabled !== undefined && { enabled }),
        ...(popularThreshold !== undefined && { popularThreshold }),
      },
    });
  }

  /** 게시판 수정 */
  async updateBoard(
    boardId: string,
    data: { name?: string; slug?: string; description?: string; sortOrder?: number; enabled?: boolean; popularThreshold?: number },
  ) {
    const board = await this.prisma.write.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다');
    }

    return this.prisma.write.board.update({
      where: { id: boardId },
      data,
    });
  }

  /** 게시판 삭제 */
  async deleteBoard(boardId: string) {
    const board = await this.prisma.write.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다');
    }

    return this.prisma.write.board.delete({ where: { id: boardId } });
  }

  /** 전체 게시판 목록 (관리자용, writer에서 조회) */
  async findAllBoards() {
    return this.prisma.write.board.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  /** 활성 게시판 목록 (공개용) */
  async findEnabledBoards(search?: string) {
    return this.prisma.read.board.findMany({
      where: {
        enabled: true,
        ...(search && { name: { contains: search } }),
      },
      orderBy: [{ sortOrder: 'asc' }],
      include: { _count: { select: { posts: true } } },
    });
  }

  /** 사이트맵용 데이터 (게시판 slug + 게시글 ID) */
  async getSitemapData() {
    const boards = await this.prisma.read.board.findMany({
      where: { enabled: true },
      select: { slug: true },
    });

    const posts = await this.prisma.read.post.findMany({
      select: { id: true, boardId: true, updatedAt: true, board: { select: { slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return {
      boards: boards.map((b) => b.slug),
      posts: posts.map((p) => ({ id: p.id, slug: p.board.slug, updatedAt: p.updatedAt })),
    };
  }

  // ── Post ──

  /** 슬러그로 게시판 조회 */
  async findBoardBySlug(slug: string) {
    const board = await this.prisma.read.board.findUnique({ where: { slug } });
    if (!board) {
      throw new NotFoundException('게시판을 찾을 수 없습니다');
    }
    return board;
  }

  /** 게시글 목록 (페이지네이션) */
  async findPosts(boardId: string, page: number, limit: number, popularOnly?: boolean) {
    // 인기글 기준을 위해 게시판 정보 조회
    const board = await this.prisma.read.board.findUnique({
      where: { id: boardId },
      select: { popularThreshold: true },
    });
    const threshold = board?.popularThreshold ?? 5;

    const where = popularOnly
      ? { boardId, likes: { some: {} } }
      : { boardId };

    const [items, total] = await Promise.all([
      this.prisma.read.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        // popularOnly일 때 threshold 미만 게시글이 섞일 수 있으므로 여유분 조회
        ...(popularOnly ? { take: limit * 3 } : { skip: (page - 1) * limit, take: limit }),
        select: {
          id: true,
          title: true,
          content: true,
          isAnonymous: true,
          createdAt: true,
          updatedAt: true,
          board: { select: { slug: true, name: true } },
          author: {
            select: { id: true, nickname: true, profileImageUrl: true },
          },
          _count: { select: { comments: true, likes: true, bookmarks: true } },
        },
      }),
      this.prisma.read.post.count({ where }),
    ]);

    // popularOnly인 경우 threshold 이상만 필터 후 페이지네이션 적용
    const filtered = popularOnly
      ? items.filter((item) => item._count.likes >= threshold)
      : items;

    const pagedItems = popularOnly
      ? filtered.slice((page - 1) * limit, page * limit)
      : filtered;

    const mapped = pagedItems.map(({ board: postBoard, author, isAnonymous, ...rest }) => ({
      ...rest,
      isAnonymous,
      boardSlug: postBoard.slug,
      boardName: postBoard.name,
      isPopular: rest._count.likes >= threshold,
      author: isAnonymous
        ? { id: 'anonymous', nickname: '익명', profileImageUrl: null }
        : author,
    }));

    const filteredTotal = popularOnly ? filtered.length : total;

    return {
      data: mapped,
      total: filteredTotal,
      page,
      pageSize: limit,
      totalPages: Math.ceil(filteredTotal / limit),
    };
  }

  /** 게시글 상세 (댓글 포함) */
  async findPostById(postId: string, requestUserId?: string) {
    const post = await this.prisma.read.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        content: true,
        isAnonymous: true,
        boardId: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, nickname: true, profileImageUrl: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            isAnonymous: true,
            createdAt: true,
            author: {
              select: { id: true, nickname: true, profileImageUrl: true },
            },
            _count: { select: { likes: true } },
          },
        },
        restaurants: {
          select: {
            id: true,
            name: true,
            address: true,
            category: true,
            latitude: true,
            longitude: true,
            kakaoPlaceId: true,
          },
        },
        _count: { select: { likes: true, comments: true, bookmarks: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다');
    }

    // 로그인 유저의 좋아요 여부 조회 (N+1 방지: 한 번에 조회)
    let postIsLiked = false;
    let myCommentLikeSet = new Set<string>();

    if (requestUserId) {
      const [postLike, myCommentLikes] = await Promise.all([
        this.prisma.read.postLike.findUnique({
          where: { postId_userId: { postId, userId: requestUserId } },
        }),
        this.prisma.read.commentLike.findMany({
          where: { userId: requestUserId, comment: { postId } },
          select: { commentId: true },
        }),
      ]);

      postIsLiked = !!postLike;
      myCommentLikeSet = new Set(myCommentLikes.map((l) => l.commentId));
    }

    // 게시글 단위 익명 번호 매기기 (글쓴이 → 1번, 이후 등장 순)
    const anonymousNumberMap = new Map<string, number>();
    let nextAnonymousNumber = 1;

    if (post.isAnonymous) {
      anonymousNumberMap.set(post.author.id, nextAnonymousNumber++);
    }
    for (const comment of post.comments) {
      if (comment.isAnonymous && !anonymousNumberMap.has(comment.author.id)) {
        anonymousNumberMap.set(comment.author.id, nextAnonymousNumber++);
      }
    }

    const postAuthorId = post.author.id;

    const toAnonymousAuthor = (authorId: string) => {
      const num = anonymousNumberMap.get(authorId) ?? nextAnonymousNumber++;
      return {
        id: 'anonymous',
        nickname: `익명${num}`,
        profileImageUrl: null,
        anonymousNumber: num,
        isPostAuthor: authorId === postAuthorId && post.isAnonymous,
      };
    };

    return {
      ...post,
      isAuthor: requestUserId ? postAuthorId === requestUserId : false,
      isLiked: postIsLiked,
      author: post.isAnonymous
        ? toAnonymousAuthor(postAuthorId)
        : post.author,
      comments: post.comments.map((comment) => ({
        ...comment,
        isLiked: myCommentLikeSet.has(comment.id),
        author: comment.isAnonymous
          ? toAnonymousAuthor(comment.author.id)
          : comment.author,
      })),
    };
  }

  /** 게시글 작성 */
  async createPost(
    boardId: string,
    authorId: string,
    title: string,
    content: string,
    isAnonymous?: boolean,
    restaurants?: { name: string; address: string; category?: string; latitude?: number; longitude?: number; kakaoPlaceId?: string }[],
  ) {
    // 게시판 존재 및 활성 여부 확인
    const board = await this.prisma.read.board.findUnique({ where: { id: boardId } });
    if (!board || !board.enabled) {
      throw new NotFoundException('게시판을 찾을 수 없습니다');
    }

    return this.prisma.write.post.create({
      data: {
        boardId,
        authorId,
        title,
        content,
        ...(isAnonymous !== undefined && { isAnonymous }),
        ...(restaurants && restaurants.length > 0 && {
          restaurants: {
            create: restaurants.slice(0, 5).map((r) => ({
              name: r.name,
              address: r.address,
              ...(r.category && { category: r.category }),
              ...(r.latitude !== undefined && { latitude: r.latitude }),
              ...(r.longitude !== undefined && { longitude: r.longitude }),
              ...(r.kakaoPlaceId && { kakaoPlaceId: r.kakaoPlaceId }),
            })),
          },
        }),
      },
    });
  }

  /** 게시글 수정 (작성자 본인만) */
  async updatePost(postId: string, userId: string, data: { title?: string; content?: string }) {
    const post = await this.prisma.read.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('본인의 게시글만 수정할 수 있습니다');
    }

    return this.prisma.write.post.update({
      where: { id: postId },
      data,
    });
  }

  /** 게시글 삭제 (작성자 또는 관리자) */
  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.read.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다');
    }

    if (post.authorId !== userId) {
      // 관리자 여부 확인
      const user = await this.prisma.read.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== 'admin') {
        throw new ForbiddenException('본인의 게시글만 삭제할 수 있습니다');
      }
    }

    return this.prisma.write.post.delete({ where: { id: postId } });
  }

  /** 내가 작성한 게시글 목록 (페이지네이션) */
  async findMyPosts(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.read.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          isAnonymous: true,
          createdAt: true,
          updatedAt: true,
          board: { select: { slug: true, name: true } },
          author: {
            select: { id: true, nickname: true, profileImageUrl: true },
          },
          _count: { select: { comments: true, likes: true, bookmarks: true } },
        },
      }),
      this.prisma.read.post.count({ where: { authorId: userId } }),
    ]);

    const mapped = items.map(({ board, ...rest }) => ({
      ...rest,
      boardSlug: board.slug,
      boardName: board.name,
      isPopular: false,
    }));

    return {
      data: mapped,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Comment ──

  /** 댓글 작성 */
  async createComment(postId: string, authorId: string, content: string, isAnonymous?: boolean) {
    const post = await this.prisma.read.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다');
    }

    return this.prisma.write.comment.create({
      data: {
        postId,
        authorId,
        content,
        ...(isAnonymous !== undefined && { isAnonymous }),
      },
    });
  }

  // ── Likes ──

  /** 게시글 추천 토글 */
  async togglePostLike(postId: string, userId: string) {
    const existing = await this.prisma.read.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.write.postLike.delete({ where: { id: existing.id } });
      const count = await this.prisma.read.postLike.count({ where: { postId } });
      return { liked: false, likeCount: count };
    }
    await this.prisma.write.postLike.create({ data: { postId, userId } });
    const count = await this.prisma.read.postLike.count({ where: { postId } });
    return { liked: true, likeCount: count };
  }

  /** 댓글 추천 토글 */
  async toggleCommentLike(commentId: string, userId: string) {
    const existing = await this.prisma.read.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (existing) {
      await this.prisma.write.commentLike.delete({ where: { id: existing.id } });
      const count = await this.prisma.read.commentLike.count({ where: { commentId } });
      return { liked: false, likeCount: count };
    }
    await this.prisma.write.commentLike.create({ data: { commentId, userId } });
    const count = await this.prisma.read.commentLike.count({ where: { commentId } });
    return { liked: true, likeCount: count };
  }

  // ── Bookmark ──

  /** 게시글 북마크 토글 */
  async toggleBookmark(postId: string, userId: string) {
    const existing = await this.prisma.read.postBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.write.postBookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
    await this.prisma.write.postBookmark.create({ data: { postId, userId } });
    return { bookmarked: true };
  }

  /** 댓글 삭제 (작성자 또는 관리자) */
  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.read.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다');
    }

    if (comment.authorId !== userId) {
      const user = await this.prisma.read.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role !== 'admin') {
        throw new ForbiddenException('본인의 댓글만 삭제할 수 있습니다');
      }
    }

    return this.prisma.write.comment.delete({ where: { id: commentId } });
  }
}
