# Vector

notes from the [3b1b vectors series](https://www.youtube.com/watch?v=fNk_zzaMoSs)

- addition: The vector addtion is like walking the x/y/z separately and to the destination. So vector averaging kind of makes sense in NLP when it comes to semantic meaning of sentences/phrases. `linear combination`
- multiply: scale the vector length.
- linearly dependent: in a set of vectors, some vector can be represented by combination of other vectors. The `basis` of a vector space is a set of `linearly independent` vectors that `span` the full space.

## Linear transformation

- [line remains line, origin remains](https://www.youtube.com/watch?v=kYB8IZa5AuE). parallel and evenly spaced
- it is like moving the base i/j(i, j are the basis vector), so we can calculate any transformed vector by using the coordinate of the moved basis vectors. we can write the combination of these moved coordinates to a matrix. Matrices are transformation of space. for a 2 by 2, first column is where x ends up and 2nd column is where y ends up.
  - if the 2 columns are linear dependent, it will collapse/squish into a single line.(one dimensional span)
  - for [1 0]
        [0 1], this is means nothing changed, x still in first column as  (1, 0) with the same 1 unit. same for y.
    for [2 0]
        [0 3], this does not turn the space but just scale x by 2 and y by 3
    for [0 -1]
        [1  0], this means, x is now in (0, 1) and y in (-1, 0) which means the space is turned 90 degree counter clockwise comparing to the original x -> (1, 0) and y -> (0, 1).

## Matrix multipilication as composition

- multiply of matrix has a geometric meaning of applying one transformation then another.
- M1 * M2 != M2 * M1 because sequence/order matters when doing different transformation. (AB)C == A(BC) it is associative(the way you group them with parentheses doesn’t change the result) because the both are C->B->A (right to left).

## determinant(行列式)

- In mathematics, the determinant is a scalar-valued function of the entries of a square matrix. The determinant of a matrix A is commonly denoted det(A), det A, or |A|. Its value characterizes some properties of the matrix and the linear map represented, on a given basis, by the matrix. In particular, the determinant is `nonzero` if and only if the matrix is invertible and the corresponding linear map is an isomorphism. However, if the determinant is zero, the matrix is referred to as singular, meaning it does not have an inverse.
- j (y) is to the left of i(x), however if after transformation the j is to the right of i, it flips the space and `determinant` will be negative. The absolute value of the determinant still tells the factor by which areas have been scaled.
- in 3d, it is the volume that scales. negative is still kind of the direction.

## inverse matrices

- A*A(-1) = [identity transformation]. A*X = V -> X = A(-1)*V, when # of equations equals # of unknows. 
- Rank: The maximum number of linearly independent rows or columns in the matrix.

## dot product

-  The dot product of two vectors has a significant geometric interpretation: it represents the product of the magnitudes of the two vectors and the cosine of the angle between them. This means that the dot product quantifies `how much one vector extends in the direction of another`. Specifically, it can be calculated using the formula: a · b = |a| × |b| × cos(θ), where θ is the angle between the vectors. Additionally, the dot product can be understood as a measure of projection, indicating how much of one vector lies in the direction of another.
