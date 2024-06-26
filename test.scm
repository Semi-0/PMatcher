; (define match-s-exp 
;     (lambda (exp)
;         ("(" (?? exp) ")")
;             (.list (match-s-exp exp))
;         ( (?? exp) " " (?? rest))
;             (cons (mk-atom exp) (match-s-exp rest))
;         ( (?? exp) (? a (is symbol)) )
;             (mk-atom exp)))
