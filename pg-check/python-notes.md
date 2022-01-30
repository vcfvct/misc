## Call the * operator followed by the list to unpack the elements of the list as arguments to a function.

```python
a_list = ["a", "b", "c"]

def print_three_elements(first_element, second_element, third_element):  #Unpack as function arguments
	print(first_element)
	print(second_element)
	print(third_element)

print_three_elements(*a_list)  # `*` implicitly unpacks the list
```
* [asyncio.Semaphore RuntimeError: Task got Future attached to a different loop](https://stackoverflow.com/questions/55918048/asyncio-semaphore-runtimeerror-task-got-future-attached-to-a-different-loop)