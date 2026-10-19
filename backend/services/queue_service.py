"""
Indexed Max Heap Priority Queue with Anti-Starvation Aging
Operations: insert, extract_max, peek, update_key (O(log n)), remove (O(log n))
In-memory per hospital with persistence and sync from DB.
"""

import time
from typing import Dict, List, Optional, Any
from datetime import datetime

class HeapNode:
    def __init__(self, patient_id: int, base_priority: float, arrival_ts: float, patient_code: str = "", patient_name: str = "", level: str = "P3", disposition: str = "Ward"):
        self.patient_id = patient_id
        self.base_priority = base_priority
        self.effective_priority = base_priority
        self.arrival_ts = arrival_ts # Unix timestamp
        self.patient_code = patient_code
        self.patient_name = patient_name
        self.level = level
        self.disposition = disposition
        self.wait_minutes = 0.0

    def compute_effective(self, current_ts: float, aging_rate: float = 0.5, aging_cap: float = 20.0) -> float:
        wait_mins = max(0.0, (current_ts - self.arrival_ts) / 60.0)
        self.wait_minutes = round(wait_mins, 1)
        # Cap aging boost so lower priority cannot jump ahead of urgent P1s (P4 cap cannot reach P1)
        # For P4 (<40), max boost 15 -> max 55 (remains below P2/P1)
        cap = 15.0 if self.base_priority < 40 else aging_cap
        boost = min(cap, aging_rate * wait_mins)
        self.effective_priority = min(100.0, self.base_priority + boost)
        return self.effective_priority

    def __lt__(self, other: "HeapNode") -> bool:
        # Max-heap comparison: higher effective_priority comes first
        if abs(self.effective_priority - other.effective_priority) > 1e-4:
            return self.effective_priority < other.effective_priority
        # Tie break on earlier arrival (smaller arrival_ts is preferred, so smaller ts is > in max-heap)
        return self.arrival_ts > other.arrival_ts

    def __gt__(self, other: "HeapNode") -> bool:
        if abs(self.effective_priority - other.effective_priority) > 1e-4:
            return self.effective_priority > other.effective_priority
        return self.arrival_ts < other.arrival_ts

    def to_dict(self) -> Dict[str, Any]:
        return {
            "patient_id": self.patient_id,
            "patient_code": self.patient_code,
            "patient_name": self.patient_name,
            "base_priority": round(self.base_priority, 1),
            "effective_priority": round(self.effective_priority, 1),
            "arrival_ts": self.arrival_ts,
            "wait_minutes": self.wait_minutes,
            "level": self.level,
            "disposition": self.disposition
        }


class IndexedMaxHeap:
    def __init__(self, hospital_id: int):
        self.hospital_id = hospital_id
        self.heap: List[HeapNode] = []
        self.pos: Dict[int, int] = {} # patient_id -> heap index

    def _swap(self, i: int, j: int):
        self.heap[i], self.heap[j] = self.heap[j], self.heap[i]
        self.pos[self.heap[i].patient_id] = i
        self.pos[self.heap[j].patient_id] = j

    def _sift_up(self, idx: int):
        parent = (idx - 1) // 2
        while idx > 0 and self.heap[idx] > self.heap[parent]:
            self._swap(idx, parent)
            idx = parent
            parent = (idx - 1) // 2

    def _sift_down(self, idx: int):
        size = len(self.heap)
        while True:
            largest = idx
            left = 2 * idx + 1
            right = 2 * idx + 2

            if left < size and self.heap[left] > self.heap[largest]:
                largest = left
            if right < size and self.heap[right] > self.heap[largest]:
                largest = right

            if largest != idx:
                self._swap(idx, largest)
                idx = largest
            else:
                break

    def insert(self, node: HeapNode) -> None:
        if node.patient_id in self.pos:
            self.update_key(node.patient_id, node.base_priority, node.level, node.disposition)
            return
        idx = len(self.heap)
        self.heap.append(node)
        self.pos[node.patient_id] = idx
        self._sift_up(idx)

    def extract_max(self) -> Optional[HeapNode]:
        if not self.heap:
            return None
        max_node = self.heap[0]
        last_node = self.heap.pop()
        del self.pos[max_node.patient_id]

        if self.heap:
            self.heap[0] = last_node
            self.pos[last_node.patient_id] = 0
            self._sift_down(0)
        return max_node

    def peek(self) -> Optional[HeapNode]:
        return self.heap[0] if self.heap else None

    def remove(self, patient_id: int) -> Optional[HeapNode]:
        if patient_id not in self.pos:
            return None
        idx = self.pos[patient_id]
        target = self.heap[idx]
        last = self.heap.pop()
        del self.pos[patient_id]

        if idx < len(self.heap):
            self.heap[idx] = last
            self.pos[last.patient_id] = idx
            self._sift_up(idx)
            self._sift_down(idx)
        return target

    def update_key(self, patient_id: int, new_priority: float, level: Optional[str] = None, disposition: Optional[str] = None) -> bool:
        if patient_id not in self.pos:
            return False
        idx = self.pos[patient_id]
        old_val = self.heap[idx].effective_priority
        self.heap[idx].base_priority = new_priority
        self.heap[idx].effective_priority = new_priority
        if level:
            self.heap[idx].level = level
        if disposition:
            self.heap[idx].disposition = disposition

        if new_priority > old_val:
            self._sift_up(idx)
        else:
            self._sift_down(idx)
        return True

    def apply_aging(self, current_ts: Optional[float] = None) -> List[int]:
        """
        Recalculates effective priorities and re-heaps. Returns IDs that updated.
        """
        if current_ts is None:
            current_ts = time.time()
        updated_ids = []
        for i, node in enumerate(self.heap):
            old_p = node.effective_priority
            new_p = node.compute_effective(current_ts)
            if abs(new_p - old_p) > 0.05:
                updated_ids.append(node.patient_id)

        # Rebuild heap in O(n)
        for i in range(len(self.heap) // 2 - 1, -1, -1):
            self._sift_down(i)
        for i, node in enumerate(self.heap):
            self.pos[node.patient_id] = i
        return updated_ids

    def get_sorted_list(self) -> List[Dict[str, Any]]:
        # Sort copy descending
        return [node.to_dict() for node in sorted(self.heap, key=lambda n: (n.effective_priority, -n.arrival_ts), reverse=True)]

    def get_heap_tree(self) -> List[Dict[str, Any]]:
        # Returns raw heap array representing binary tree
        return [node.to_dict() for node in self.heap]

    def size(self) -> int:
        return len(self.heap)


# Global in-memory heap store keyed by hospital_id
hospital_heaps: Dict[int, IndexedMaxHeap] = {}

def get_hospital_heap(hospital_id: int) -> IndexedMaxHeap:
    if hospital_id not in hospital_heaps:
        hospital_heaps[hospital_id] = IndexedMaxHeap(hospital_id)
    return hospital_heaps[hospital_id]
