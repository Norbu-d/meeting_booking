export class PaginationHelper {
  static validatePaginationParams(page, limit, maxLimit = 100) {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));
    
    return {
      page: safePage,
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit
    };
  }

  static buildPaginationMetadata(page, limit, totalCount, itemsInPage) {
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      current_page: page,
      per_page: limit,
      total_items: totalCount,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
      next_page: page < totalPages ? page + 1 : null,
      prev_page: page > 1 ? page - 1 : null,
      items_in_page: itemsInPage
    };
  }

  static generatePageLinks(baseUrl, page, totalPages, queryParams = {}) {
    const links = {
      first: null,
      last: null,
      next: null,
      prev: null
    };

    const buildUrl = (pageNum) => {
      const params = new URLSearchParams({
        ...queryParams,
        page: pageNum,
        limit: queryParams.limit || 20
      });
      return `${baseUrl}?${params.toString()}`;
    };

    if (totalPages > 0) {
      links.first = buildUrl(1);
      links.last = buildUrl(totalPages);
    }

    if (page < totalPages) {
      links.next = buildUrl(page + 1);
    }

    if (page > 1) {
      links.prev = buildUrl(page - 1);
    }

    return links;
  }
}

export default PaginationHelper;