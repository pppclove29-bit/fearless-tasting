export interface TimelineItem {
  type: 'restaurant_added' | 'visit_added' | 'review_added' | 'member_joined';
  date: string;
  data: Record<string, unknown>;
}
